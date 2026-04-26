import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { motion } from 'motion/react';
import { ArrowLeft, Play, Copy, CheckCircle2 } from 'lucide-react';

interface ChallengePreviewData {
  title: string;
  description: string;
  difficulty: string;
  primaryLanguage: string;
  tags: string[];
  requirements: string;
  resources: string;
  starterCode: string;
  estimatedTime: string;
  isCompanyChallenge: boolean;
  companyName?: string;
}

export function PreviewChallenge() {
  const navigate = useNavigate();
  const location = useLocation();
  const challengeData = location.state as ChallengePreviewData | undefined;
  const [previewUrl, setPreviewUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState(challengeData?.starterCode || '');

  if (!challengeData) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <p className="text-slate-400 mb-4">No challenge data provided</p>
          <button
            onClick={() => navigate('/challenges')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
          >
            Back to Challenges
          </button>
        </div>
      </div>
    );
  }

  const handleRun = () => {
    if (!challengeData.starterCode && !code) {
      return;
    }

    const htmlFile = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${challengeData.title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              margin: 0;
              padding: 20px;
              background: #0f172a;
              color: #f1f5f9;
            }
            h1, h2, h3 { color: #e2e8f0; }
            pre { background: #1e293b; padding: 10px; border-radius: 4px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <h1>${challengeData.title}</h1>
          <script>${code}</script>
        </body>
      </html>
    `;

    const blob = new Blob([htmlFile], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-slate-950">
      {/* Top Bar */}
      <div className="border-b border-slate-800 bg-slate-900/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              {challengeData.isCompanyChallenge && (
                <span className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-xs font-bold">
                  {challengeData.companyName}
                </span>
              )}
              {challengeData.title}
            </h1>
            <p className="text-slate-400 text-sm mt-1">{challengeData.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-bold">
            {challengeData.difficulty}
          </span>
          <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-bold">
            {challengeData.estimatedTime}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Challenge Info */}
        <div className="w-96 flex-shrink-0 border-r border-slate-800 bg-slate-900/30 overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-6">
            {/* Meta Info */}
            <div>
              <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Challenge Info</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Language</p>
                  <p className="text-slate-300">{challengeData.primaryLanguage}</p>
                </div>
                {challengeData.tags.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {challengeData.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Requirements */}
            <div>
              <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Requirements</h3>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
                <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {challengeData.requirements}
                </p>
              </div>
            </div>

            {/* Resources */}
            {challengeData.resources && (
              <div>
                <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Resources</h3>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
                  <p className="text-sm text-slate-400 whitespace-pre-wrap">
                    {challengeData.resources}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Editor & Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor Section */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800">
            <div className="flex items-center justify-between px-4 h-12 bg-slate-900/50 border-b border-slate-800">
              <div className="text-sm font-bold text-slate-400">Code</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
                <button
                  onClick={handleRun}
                  className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-md text-sm font-bold transition-all shadow-lg shadow-green-900/20 active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Run
                </button>
              </div>
            </div>

            <div className="flex-1 relative bg-[#1e1e1e]">
              <Editor
                height="100%"
                language={challengeData.primaryLanguage.toLowerCase()}
                value={code}
                onChange={(value) => setCode(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              />
            </div>
          </div>

          {/* Preview Section */}
          <div className="flex-1 bg-slate-900/30 border-t border-slate-800 overflow-hidden">
            {previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-full border-none bg-white"
                title="Preview"
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6">
                <Play className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-center">
                  Click the Run button to execute your code and see the preview
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
