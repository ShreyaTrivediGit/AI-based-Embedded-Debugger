import React from 'react';
import './styles.css';

const Button = React.forwardRef(({ 
  className = '',
  variant = 'default',
  size = 'default',
  asChild = false,
  children,
  disabled,
  ...props 
}, ref) => {
  const Comp = asChild ? 'div' : 'button';
  
  const classes = `button button-${variant} ${className}`;
  
  return (
    <Comp 
      className={classes}
      ref={ref}
      disabled={disabled}
      {...props}
    >
      {children}
    </Comp>
  );
});

Button.displayName = 'Button';

export { Button }; 