import type { CSSProperties } from 'react';
import {
  AlignBottomSimple, AlignCenterVerticalSimple, AlignTopSimple,
  ArrowBendRightUp, ArrowBendUpLeft, ArrowBendUpRight, ArrowDownRight,
  ArrowElbowRightUp, ArrowRight, ArrowUpRight,
  Browser, Circle, Cloud, Copy, Cursor, Diamond, DotsThreeVertical, GearSix,
  MagnifyingGlass, MagnifyingGlassMinus, MagnifyingGlassPlus, Minus,
  Palette, Path, Pill, Prohibit, Question, Rectangle, Scribble, Star,
  TextAlignCenter, TextAlignLeft, TextAlignRight, TextB, Textbox, TextItalic, TextT, Trash, X,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';

/** Semantic tool names keep icon choices independent of editor commands. */
const icons: Record<string, PhosphorIcon> = {
  undo: ArrowBendUpLeft, redo: ArrowBendUpRight, arrow: ArrowDownRight,
  rectangle: Rectangle, ellipse: Circle, diamond: Diamond, text: TextT,
  capsule: Pill, star: Star, cloud: Cloud,
  select: Cursor, sketchyMode: Scribble, zoomIn: MagnifyingGlassPlus, zoomOut: MagnifyingGlassMinus,
  settings: GearSix, drawingProperties: Palette, help: Question, editText: Textbox, search: MagnifyingGlass,
  bold: TextB, italic: TextItalic, textAlign: TextAlignCenter,
  textSizeSmall: TextT, textSizeMedium: TextT, textSizeLarge: TextT,
  textAlignLeft: TextAlignLeft, textAlignCenter: TextAlignCenter, textAlignRight: TextAlignRight,
  textAlignTop: AlignTopSimple, textAlignMiddle: AlignCenterVerticalSimple, textAlignBottom: AlignBottomSimple,
  lineRouting: Path,
  routingStraight: ArrowUpRight, routingOrthogonal: ArrowElbowRightUp, routingCurved: ArrowBendRightUp,
  groupTheme: Browser, groupTitleStyle: Textbox, moreOptions: DotsThreeVertical,
  copy: Copy, delete: Trash, close: X, transparent: Prohibit,
};

/*! Material Symbols Outlined | Copyright Google LLC | Apache-2.0
 * See MaterialSymbols-LICENSE.txt and MaterialSymbols-NOTICE.txt in the distribution. */
// Keep upstream paths intact for property/endpoint previews absent from Phosphor.
const materialSymbols = {
  roundedCorner: {
    viewBox: '0 0 24 24',
    path: 'M3,21V19H5v2H3Zm0-4V15H5v2H3Zm0-4V11H5v2H3ZM3,9V7H5V9H3ZM3,5V3H5V5H3ZM7,21V19H9v2H7ZM7,5V3H9V5H7Zm4,16V19h2v2H11Zm4,0V19h2v2H15Zm4,0V19h2v2H19Zm0-4V15h2v2H19Zm2-4H19V8q0-1.25-0.88-2.13T16,5H11V3h5q2.07,0 3.54,1.46Q21,5.93 21,8v5Z',
  },
  lineStyle: {
    viewBox: '0 -960 960 960',
    path: 'M120-160v-80h80v80h-80Zm0-160v-80h200v80H120Zm0-160v-80h320v80H120Zm0-160v-160h720v160H120Zm160 480v-80h80v80h-80Zm100-160v-80h200v80H380Zm60 160v-80h80v80h-80Zm80-320v-80h320v80H520Zm80 320v-80h80v80h-80Zm40-160v-80h200v80H640Zm120 160v-80h80v80h-80Z',
  },
  lineEndArrowNotch: {
    viewBox: '0 -960 960 960',
    path: 'm440-200 137-240H80v-80h497L440-760l440 280-440 280Z',
  },
  lineEndCircle: {
    viewBox: '0 -960 960 960',
    path: 'M640-240q-90 0-156.5-57T403-440H80v-80h323q14-86 80.5-143T640-720q100 0 170 70t70 170q0 100-70 170t-170 70Z',
  },
  lineEndDiamond: {
    viewBox: '0 -960 960 960',
    path: 'M600-200 360-440H80v-80h280l240-240 280 280-280 280Z',
  },
};

/** Inline upstream SVGs inherit the local theme; start markers mirror only on X. */
function MaterialSymbol({ name, size, mirrored = false, style }: { name: keyof typeof materialSymbols; size: number; mirrored?: boolean; style?: CSSProperties }) {
  const symbol = materialSymbols[name];
  return <svg viewBox={symbol.viewBox} width={size} height={size} fill="currentColor" aria-hidden="true" style={style}>
    <g transform={mirrored ? 'translate(960 0) scale(-1 1)' : undefined}><path d={symbol.path} /></g>
  </svg>;
}

/** Ordinary controls use Phosphor; explicit sourced exceptions inherit the same theme color. */
export function Icon({ name, style }: { name: string; style?: CSSProperties }) {
  if (name === 'strokeColor' || name === 'strokeFillColor') return <PaletteIcon style={style} />;
  if (name === 'lineStartStyle' || name === 'lineEndStyle') return <EndpointIcon value={1} start={name === 'lineStartStyle'} style={style} />;
  if (name === 'strokeStyle') return <MaterialSymbol name="lineStyle" size={19} style={style} />;
  if (name === 'cornerRadius') return <MaterialSymbol name="roundedCorner" size={19} style={style} />;
  if (name === 'swapLineEndpoints') {
    // Preserve swap2.svg from 046e446c41200cb18a98b143293aea02bb1bfcdd for endpoint exchange.
    return <svg viewBox="0 0 1024 1024" width="19" height="19" fill="currentColor" aria-hidden="true" style={style}>
      <path d="M723.498667 512l-170.666667-170.666667v341.333334z m-426.666667 0l170.666667 170.666667V341.333333z" />
    </svg>;
  }
  const Component = icons[name] ?? Rectangle;
  const size = name === 'textSizeSmall' ? 14 : name === 'textSizeLarge' ? 24 : 19;
  return <Component size={size} weight="regular" aria-hidden="true" style={style} />;
}

/** The native duotone layer carries fill independently of the palette outline. */
export function PaletteIcon({ fill = 'none', style }: { fill?: string; style?: CSSProperties }) {
  return <Palette size={20} weight="duotone" className="dm-palette" aria-hidden="true"
    style={{ '--dm-palette-fill': fill, ...style } as CSSProperties} />;
}

// Original line-style-{solid,dash,dot}.svg paths from 046e446c41200cb18a98b143293aea02bb1bfcdd.
const lineStylePaths: Record<string, string> = {
  Solid: 'M134.613333 776.106667l-41.130666-71.253334L886.272 245.333333l41.130667 71.253334z',
  Dashed: 'M124.373333 781.141333l-41.173333-71.253333 127.744-75.52 41.130667 71.253333z m238.165334-135.765333l-41.130667-71.253333 131.242667-75.776 41.130666 71.253333z m238.08-139.178667l-41.173334-71.253333 120.234667-69.418667 41.130667 71.253334z m224.853333-129.877333l-41.088-71.253333 120.234667-69.418667 41.130666 71.253333z',
  Dotted: 'M122.368 781.866667l-41.130667-71.253334 53.802667-32.853333 41.130667 71.253333z m112.384-63.104l-41.173333-71.253334 57.344-33.066666 41.130666 71.253333z m116.309333-66.944l-41.130666-71.253334 57.301333-33.066666 41.130667 71.253333z m113.109334-63.786667l-41.130667-71.253333 57.301333-33.066667 41.130667 71.253333z m110.848-64l-41.130667-71.253333 57.301333-33.066667 41.130667 71.253333z m108.885333-64.512l-41.173333-71.253333 57.344-33.109334 41.130666 71.253334z m104.106667-60.117333l-41.173334-71.253334 57.344-33.066666 41.130667 71.253333z m102.272-62.72l-41.130667-71.253334 57.301333-33.066666 41.130667 71.253333z',
};

/** Width choices use Phosphor weights; pattern choices retain the historical SVGs. */
export function StrokeIcon({ width, pattern }: { width?: number; pattern?: string }) {
  if (pattern === undefined) return <Minus size={20} weight={width === 0 ? 'thin' : width === 2 ? 'bold' : 'regular'} aria-hidden="true" />;
  return <svg viewBox="0 0 1024 1024" width="20" height="20" fill="currentColor" aria-hidden="true">
    <path d={lineStylePaths[pattern] ?? lineStylePaths.Solid} />
  </svg>;
}

/** Preserve the engine's six endpoint meanings in Y-down coordinates. */
export function EndpointIcon({ value, start = false, style }: { value: number; start?: boolean; style?: CSSProperties }) {
  if (value <= 2) {
    const Component = value === 0 ? Minus : ArrowRight;
    return <Component size={22} weight={value === 2 ? 'fill' : 'regular'} mirrored={start} aria-hidden="true" style={style} />;
  }
  // Historical arrow-start/end SVGs and the engine use filled markers on a shaft.
  // Material supplies these complete previews; standalone Phosphor shapes omit the shaft.
  const name = value === 3 ? 'lineEndArrowNotch' : value === 4 ? 'lineEndCircle' : 'lineEndDiamond';
  return <MaterialSymbol name={name} size={22} mirrored={start} style={style} />;
}
