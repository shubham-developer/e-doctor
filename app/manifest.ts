import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DoctorCloud — Hospital & Clinic Management",
    short_name: "DoctorCloud",
    description: "Manage your hospital and clinic operations",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#155EEF",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
