import { validateJwtSecretAtStartup } from "./utils/jwt.js";
import { app } from "./app.js";

// Fail-fast at application startup if JWT_SECRET is missing or weak in production
validateJwtSecretAtStartup();

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`TokTickIT API listening on http://localhost:${PORT}`);
});
