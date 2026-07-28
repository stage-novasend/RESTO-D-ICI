import { SURFACE, BORDER } from '../../theme/colors';

/* Carte blanche standard — remplace les innombrables
   <div className="bg-white rounded-2xl border" style={{ borderColor: BORDER }}> */
export default function Card({
  as: Tag = 'div',
  padded = true,
  className = '',
  style = {},
  children,
  ...rest
}) {
  return (
    <Tag
      className={`rounded-2xl border ${padded ? 'p-5' : ''} ${className}`}
      style={{ background: SURFACE, borderColor: BORDER, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
