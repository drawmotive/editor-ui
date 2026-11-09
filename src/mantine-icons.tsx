import { forwardRef } from 'react';
import { Checkbox, CloseButton, Loader, NativeSelect, PasswordInput, type MantineThemeOverride } from '@mantine/core';
import { CaretUpDown, Check, Eye, EyeSlash, Minus, SpinnerGap, X, type IconProps } from '@phosphor-icons/react';

const CheckboxIcon: Checkbox.IconComponent = ({ indeterminate, ...props }) => {
  const Component = indeterminate ? Minus : Check;
  return <Component {...props} size="100%" weight="bold" aria-hidden="true" />;
};

function PasswordVisibilityIcon({ reveal }: { reveal: boolean }) {
  const Component = reveal ? EyeSlash : Eye;
  return <Component size="var(--psi-icon-size)" weight="regular" aria-hidden="true" />;
}

/** Preserve Mantine's size, color, refs and loading state while replacing its CSS oval. */
const PhosphorLoader = forwardRef<SVGSVGElement, IconProps>(({ className, style, size, ...props }, ref) =>
  <SpinnerGap {...props} ref={ref} size="var(--loader-size)" weight="regular" aria-hidden="true"
    className={['dm-phosphor-loader', className].filter(Boolean).join(' ')} style={{ color: 'var(--loader-color)', ...style }} />);

/** Shared defaults also cover icons rendered inside Mantine, without replacing component behavior. */
export const phosphorTheme: MantineThemeOverride = { components: {
  Checkbox: Checkbox.extend({ defaultProps: { icon: CheckboxIcon } }),
  CloseButton: CloseButton.extend({ defaultProps: { icon: <X size="var(--cb-icon-size, 70%)" weight="regular" aria-hidden="true" /> } }),
  NativeSelect: NativeSelect.extend({ defaultProps: { rightSection: <CaretUpDown size="1em" weight="regular" aria-hidden="true" /> } }),
  PasswordInput: PasswordInput.extend({ defaultProps: { visibilityToggleIcon: PasswordVisibilityIcon } }),
  Loader: Loader.extend({ defaultProps: { loaders: { ...Loader.defaultLoaders, phosphor: PhosphorLoader }, type: 'phosphor' } }),
} };
