import type { Metadata } from "next";
import { CommunityScores } from "../../../components/community-scores";

export const metadata: Metadata = {
  title: "公共谱库与 MusicXML｜谱练",
  description: "导入 MusicXML 到无需账号的公共谱库，并使用电脑键盘或 MIDI 键盘逐音练习。",
};

export default function CommunityLibraryPage() {
  return <CommunityScores />;
}
