import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { Section } from "../lib/types";
import { SectionRenderer } from "./Sections";
import { useDocumentTitle } from "./useSite";
import NotFound from "./NotFound";
import { LoadingBlock } from "../components/ui";

type PublicPage = { title: string; slug: string; sections: Section[]; seo: { title?: string; description?: string } };

export default function CmsPageView() {
  const { slug = "" } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["page", slug],
    queryFn: async () => (await api.get<{ data: PublicPage }>(`/pages/${encodeURIComponent(slug)}`)).data.data,
    retry: false,
  });
  useDocumentTitle(data?.seo?.title || data?.title);

  if (isLoading) return <LoadingBlock />;
  if (isError || !data) return <NotFound />;
  return <SectionRenderer sections={data.sections} />;
}
