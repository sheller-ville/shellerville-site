export default async (request, context) => {
  const password = Netlify.env.get("CASE_STUDY_PASSWORD");

  if (!password) {
    return new Response("This page is not yet configured.", { status: 503 });
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const hasValidSession = cookieHeader
    .split(";")
    .some((c) => c.trim() === "case_study_auth=granted");

  if (hasValidSession) {
    return context.next();
  }

  if (request.method === "POST") {
    const formData = await request.formData();
    const submitted = formData.get("password");

    if (submitted === password) {
      const response = await context.next();
      const headers = new Headers(response.headers);
      headers.append(
        "Set-Cookie",
        "case_study_auth=granted; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400"
      );
      return new Response(response.body, {
        status: response.status,
        headers,
      });
    }

    return new Response(passwordPage("Wrong password, try again."), {
      status: 401,
      headers: { "content-type": "text/html" },
    });
  }

  return new Response(passwordPage(), {
    status: 401,
    headers: { "content-type": "text/html" },
  });
};

function passwordPage(error = "") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Private / Christine Sheller</title>
<style>
  body{background:#000;color:#fff;font-family:'Plus Jakarta Sans',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
  form{text-align:center}
  input{padding:12px 16px;border-radius:8px;border:1px solid #333;background:#111;color:#fff;font-size:16px;margin-bottom:12px;width:240px}
  button{padding:12px 24px;border-radius:8px;border:none;background:#EB1000;color:#fff;font-weight:600;cursor:pointer;font-size:16px}
  p.error{color:#EB1000;margin-bottom:12px}
  h1{font-size:20px;margin-bottom:20px;font-weight:600}
</style>
</head>
<body>
<form method="POST">
  <h1>This page is private</h1>
  ${error ? `<p class="error">${error}</p>` : ""}
  <input type="password" name="password" placeholder="Password" required autofocus><br>
  <button type="submit">Enter</button>
</form>
</body>
</html>`;
}
