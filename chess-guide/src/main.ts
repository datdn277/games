import "./styles.css";
import { ChessAcademyGame } from "./game/ChessAcademyGame";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Không tìm thấy phần tử #app.");

new ChessAcademyGame(root);
