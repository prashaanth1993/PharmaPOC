import { useState } from 'react';

export default function AnnotationCanvas({ asset, onAnnotate, authorPersona }) {
  const [pendingPin, setPendingPin] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);

  function handleClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPin({ xPercent, yPercent });
  }

  function handleSave(comment) {
    onAnnotate({ ...pendingPin, comment, authorPersona });
    setPendingPin(null);
  }

  return (
    <div className="annotation-canvas" onClick={handleClick}>
      {imageFailed ? (
        <div className="annotation-canvas-fallback" aria-hidden="true">
          {asset.NAME}
        </div>
      ) : (
        <img src={asset.FILE_URL} alt={asset.NAME} onError={() => setImageFailed(true)} />
      )}
      {pendingPin && (
        <form onSubmit={(e) => { e.preventDefault(); handleSave(e.target.comment.value); }}>
          <input name="comment" placeholder="Annotation comment" autoFocus />
          <button type="submit">Save pin</button>
        </form>
      )}
    </div>
  );
}
