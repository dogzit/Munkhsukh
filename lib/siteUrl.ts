// Сайтын үндсэн хаяг (robots, sitemap, metadata-д хэрэглэнэ).
// APP_URL тохируулаагүй бол Vercel-ийн production домэйныг авна.
export function siteUrl() {
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
