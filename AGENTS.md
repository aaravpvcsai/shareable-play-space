<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the standalone game in public/game.html; mountain-specific artwork, enemies, and scenery live in public/mountain.js and reuse the game's movement and combat loop to preserve existing mechanics.
- Serve uploaded pixel-art layers through Lovable Assets pointers and a scene manifest; separated wind and sun layers allow animation without replacing the user's artwork.
