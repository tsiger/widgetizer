export default function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div className="p-6 text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
      <p className="mt-2 text-slate-500">{message}</p>
    </div>
  );
}
