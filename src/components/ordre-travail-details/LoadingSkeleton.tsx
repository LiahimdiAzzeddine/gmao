export const LoadingSkeleton = () => {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-32" />
          </div>
          <div className="h-10 bg-gray-200 rounded w-40" />
        </div>

        <div className="h-32 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
};
