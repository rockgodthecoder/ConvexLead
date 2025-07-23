import React, { useState } from 'react';

interface PDFViewerProps {
  fileUrl: string;
  title?: string;
  className?: string;
}

export function PDFViewer({ fileUrl, title, className = "" }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (hasError) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 text-center ${className}`}>
        <div className="text-gray-500 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to display PDF</h3>
        <p className="text-gray-600 mb-4">The PDF couldn't be loaded in the browser viewer.</p>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          📄 Download PDF
        </a>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {title && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        </div>
      )}
      
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading PDF...</p>
            </div>
          </div>
        )}
        
        <embed
          src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
          type="application/pdf"
          width="100%"
          height="600px"
          onLoad={handleLoad}
          onError={handleError}
          className="block"
        />
      </div>
      
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>PDF Viewer</span>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 underline"
          >
            Open in new tab
          </a>
        </div>
      </div>
    </div>
  );
} 