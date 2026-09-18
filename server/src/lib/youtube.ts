import { YoutubeTranscript } from "youtube-transcript";
import { ValidationError } from "../types/app-error.js";

export async function fetchYoutubeTranscript(url: string) {
    const videoId =
        url.match(
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
        )?.[1] ?? url.match(/youtube\.com\/shorts\/([\w-]{11})/)?.[1];

    if (!videoId) {
        throw new ValidationError("Enter a valid YouTube URL");
    }

    try {
        const segments = await YoutubeTranscript.fetchTranscript(videoId);
        const content = segments.map((segment) => segment.text).join(" ").trim();

        if (!content) {
            throw new ValidationError(
                "No transcript found for this video",
            );
        }

        return { videoId, content };
    } catch {
        throw new ValidationError(
            "Could not fetch transcript. The video may not have captions.",
        );
    }
}


//more feature implemented......

// import { YoutubeTranscript } from "youtube-transcript";
// import { ValidationError } from "../types/app-error.js";

// function extractYoutubeVideoId(url: string): string | null {
//     try {
//         const parsedUrl = new URL(url);

//         const hostname = parsedUrl.hostname.replace(/^www\./, "");

//         // youtube.com/watch?v=VIDEO_ID
//         if (
//             hostname === "youtube.com" ||
//             hostname === "m.youtube.com"
//         ) {
//             const videoId = parsedUrl.searchParams.get("v");

//             if (videoId && /^[\w-]{11}$/.test(videoId)) {
//                 return videoId;
//             }

//             // /shorts/VIDEO_ID
//             const shortsMatch = parsedUrl.pathname.match(
//                 /^\/shorts\/([\w-]{11})/
//             );

//             if (shortsMatch) {
//                 return shortsMatch[1];
//             }

//             // /embed/VIDEO_ID
//             const embedMatch = parsedUrl.pathname.match(
//                 /^\/embed\/([\w-]{11})/
//             );

//             if (embedMatch) {
//                 return embedMatch[1];
//             }
//         }

//         // youtu.be/VIDEO_ID
//         if (hostname === "youtu.be") {
//             const videoId = parsedUrl.pathname
//                 .split("/")
//                 .filter(Boolean)[0];

//             if (videoId && /^[\w-]{11}$/.test(videoId)) {
//                 return videoId;
//             }
//         }

//         return null;
//     } catch {
//         return null;
//     }
// }

// function cleanTranscript(text: string): string {
//     return text
//         .replace(/\s+/g, " ")
//         .trim();
// }

// export async function fetchYoutubeTranscript(url: string) {
//     const videoId = extractYoutubeVideoId(url);

//     if (!videoId) {
//         throw new ValidationError(
//             "Enter a valid YouTube URL",
//         );
//     }

//     try {
//         const segments =
//             await YoutubeTranscript.fetchTranscript(videoId);

//         if (!segments || segments.length === 0) {
//             throw new ValidationError(
//                 "No transcript found for this video",
//             );
//         }

//         const content = cleanTranscript(
//             segments
//                 .map((segment) => segment.text)
//                 .join(" "),
//         );

//         if (!content) {
//             throw new ValidationError(
//                 "Transcript is empty for this video",
//             );
//         }

//         return {
//             videoId,
//             content,
//             sourceUrl: url,
//         };
//     } catch (error) {
//         if (error instanceof ValidationError) {
//             throw error;
//         }

//         throw new ValidationError(
//             "Could not fetch transcript. The video may not have captions or may be unavailable.",
//         );
//     }
// }