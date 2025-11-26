import React, { useState } from 'react';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export const UrlInput: React.FC<UrlInputProps> = ({ onSubmit, isLoading }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto mb-8 relative z-10">
      <div className="flex flex-col gap-2">
        <label htmlFor="url-input" className="text-sm font-medium text-gray-700">
          Masukkan URL Berita
        </label>
        <div className="flex shadow-sm rounded-md">
          <input
            id="url-input"
            type="url"
            required
            disabled={isLoading}
            placeholder="https://example.com/berita-terbaru"
            className="flex-1 min-w-0 block w-full px-4 py-3 rounded-l-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500 transition-colors"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-r-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 transition-colors cursor-pointer"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Buat Story'
            )}
          </button>
        </div>
      </div>
    </form>
  );
};
