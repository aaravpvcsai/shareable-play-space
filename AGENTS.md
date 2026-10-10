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
- Mountain bosses use the shared enemy combat interface and frame-timed attacks, so kills, shields, pauses, and replay eligibility follow the same mechanics as regular enemies.
- Keep per-type token balances and the one-time inventory-unlock flag in the standalone game's session state, matching the existing session-only rewards without introducing accounts or remote persistence.
