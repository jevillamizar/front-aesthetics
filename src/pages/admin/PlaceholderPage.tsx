type Props = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-500 mb-8">{description}</p>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-gray-500 text-sm">Módulo en construcción…</p>
      </div>
    </div>
  );
}
