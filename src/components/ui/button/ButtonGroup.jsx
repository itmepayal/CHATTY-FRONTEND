export const ButtonGroup = ({
  children,
  className = "",
  orientation = "horizontal",
  attached = true,
  ...props
}) => {
  const isVertical = orientation === "vertical";
  const layoutClass = isVertical
    ? "flex flex-col"
    : "inline-flex items-center";
  const attachedClass = attached
    ? isVertical
      ? "[&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none [&>*:not(:first-child)]:-mt-px"
      : "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none [&>*:not(:first-child)]:-ml-px"
    : isVertical
      ? "gap-2"
      : "gap-2";

  return (
    <div
      role="group"
      className={`${layoutClass} ${attachedClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default ButtonGroup;
