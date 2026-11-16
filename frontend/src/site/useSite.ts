import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { SiteSettings, UniversityResource } from "../lib/types";

export function useSite() {
  return useQuery({
    queryKey: ["site"],
    queryFn: async () => (await api.get<{ data: SiteSettings }>("/site")).data.data,
    staleTime: 5 * 60_000,
  });
}

export function useUniversity() {
  return useQuery({
    queryKey: ["university"],
    queryFn: async () => (await api.get<{ data: UniversityResource[] }>("/university")).data.data,
  });
}

export function useDocumentTitle(title: string | undefined) {
  const { data: site } = useSite();
  const brand = site?.brand.name;
  useEffect(() => {
    if (title) document.title = brand ? `${title} — ${brand}` : title;
  }, [title, brand]);
}
