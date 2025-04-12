import React from 'react';
import './styles.css';

const Label = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={`label ${className || ''}`}
      {...props}
    />
  );
});

Label.displayName = "Label";

export { Label }; 