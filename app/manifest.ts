import type { MetadataRoute } from "next";

// iPhone дээр "Add to Home Screen" хийж push мэдэгдэл авахад шаардлагатай
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "11A Angiin Web App",
    short_name: "11A",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
