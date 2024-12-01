import React from 'react'

interface AnimationComponentProps {
  size: number;
}

const AnimationComponent: React.FC<AnimationComponentProps> = ({ size }) => {
  return (
    <div style={{ width: `${size}px`, height: `${size}px` }}>
      {/* Your animation content goes here */}
    </div>
  );
}

export default AnimationComponent