import { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';

export default function VirtualPreview({ html }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const container = ref.current.contentDocument?.body;
    if (!container) return;

    const root = ReactDOM.createRoot(container);
    root.render(<div dangerouslySetInnerHTML={{ __html: html }} />);
  }, [html]);

  return <iframe ref={ref} title="Virtual Preview" style={{ width: '100%', height: '100%', border: 0 }} />;
}
