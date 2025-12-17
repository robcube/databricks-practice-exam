import React from 'react';
import './CodeHighlighter.css';

interface CodeHighlighterProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
}

export const CodeHighlighter: React.FC<CodeHighlighterProps> = ({
  code,
  language = 'python',
  showLineNumbers = true
}) => {
  const lines = code.split('\n');

  return (
    <div className="code-highlighter">
      <div className="code-header">
        <span className="language-label">{language.toUpperCase()}</span>
      </div>
      <div className="code-content">
        {showLineNumbers && (
          <div className="line-numbers">
            {lines.map((_, index) => (
              <div key={index} className="line-number">
                {index + 1}
              </div>
            ))}
          </div>
        )}
        <div className="code-lines">
          <pre>
            <code>{code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};