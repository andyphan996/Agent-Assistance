async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{role: "user", parts: [{text: "debug_api_key"}]}]
      })
    });
    const text = await res.text();
    console.log("BODY:", text);
  } catch (e) {
    console.error(e);
  }
}
run();
