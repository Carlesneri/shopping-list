import { MoviPlayerAttributes} from'movi-player'
export {}

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      "movi-player": DetailedHTMLProps<MoviPlayerAttributes, HTMLElement> 
    }
  }
}
