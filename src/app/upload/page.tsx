import { UploadForm } from "./upload-form";
import { fetchCategories, fetchPlatforms } from "@/lib/queries";

export const metadata = { title: "Upload a prompt" };

export default async function UploadPage() {
  const [categories, platforms] = await Promise.all([fetchCategories(), fetchPlatforms()]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold">Sell a prompt</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Upload 1–6 example images, enter the prompt text, and set a price. Buyers only see the prompt
        text after paying. You earn 80%; 20% goes to the platform.
      </p>
      <UploadForm categories={categories} platforms={platforms} />
    </div>
  );
}
