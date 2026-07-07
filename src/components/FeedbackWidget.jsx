import React from 'react';
import '../styles/FeedbackModal.css';

function FeedbackWidget({ onClick }) {
  return (
    <div className="feedback-widget">
      <span className="feedback-tooltip">Beri Masukan</span>
      <button 
        className="feedback-trigger-btn" 
        onClick={onClick}
        title="Kirim Masukan"
        aria-label="Feedback Button"
      >
        <svg viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-3 12H7c-.55 0-1-.45-1-1s.45-1 1-1h10c.55 0 1 .45 1 1s-.45 1-1 1zm0-3H7c-.55 0-1-.45-1-1s.45-1 1-1h10c.55 0 1 .45 1 1s-.45 1-1 1zm0-3H7c-.55 0-1-.45-1-1s.45-1 1-1h10c.55 0 1 .45 1 1s-.45 1-1 1z"/>
        </svg>
      </button>
    </div>
  );
}

export default FeedbackWidget;
