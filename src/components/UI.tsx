import React from 'react';

interface UIProps {
  newsLifespan: number;
  setNewsLifespan: (value: number) => void;
}

const UI: React.FC<UIProps> = ({ newsLifespan, setNewsLifespan }) => {
  return (
    <div className="ui-overlay">
      <div style={{ flex: 1 }}></div>
      <div className="ui-controls">
        <div className="ui-title">OZ Control Panel</div>
        <div className="slider-container">
          <div className="slider-label">
            <span>News Display Duration</span>
            <span>{newsLifespan}s</span>
          </div>
          <input
            type="range"
            min="5"
            max="60"
            value={newsLifespan}
            onChange={(e) => setNewsLifespan(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
};

export default UI;
