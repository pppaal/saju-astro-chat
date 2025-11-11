export default function SuccessPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const sid = typeof searchParams?.session_id === 'string' ? searchParams.session_id : null;
  return (
    <main style={{ padding: 24 }}>
      <h1>Success</h1>
      <p>session_id: {sid ?? 'none'}</p>
    </main>
  );
}