import { ExternalLink, Link2 } from "lucide-react";
import { Section } from "./UserInfoUI.jsx";

export const UserInfoSharedSection = ({
  recentPhotos,
  photosCount,
  recentLinks,
  uniqueLinksCount,
}) => {
  return (
    <>
      {recentPhotos.length > 0 && (
        <>
          <div className="border-t border-base-300" />
          <Section title="Shared photos" aside={photosCount}>
            <div className="grid grid-cols-3 gap-1.5">
              {recentPhotos.map((m) => (
                <a
                  key={m.clientId || m.id || m._id}
                  href={m.image.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block aspect-square overflow-hidden rounded-lg bg-base-200"
                >
                  <img
                    src={m.image.url}
                    alt="Shared"
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-200 hover:scale-105"
                  />
                </a>
              ))}
            </div>
          </Section>
        </>
      )}

      {recentLinks.length > 0 && (
        <>
          <div className="border-t border-base-300" />
          <Section title="Shared links" aside={uniqueLinksCount}>
            <ul className="space-y-1.5">
              {recentLinks.map(({ url, host, rest }) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group flex items-center gap-3 rounded-xl bg-base-200/60 px-3 py-2.5 transition-colors hover:bg-base-200"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-base-100">
                      <Link2 className="size-4 text-base-content/60" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{host}</p>
                      {rest && (
                        <p className="truncate text-xs text-base-content/50">
                          {rest}
                        </p>
                      )}
                    </div>
                    <ExternalLink className="size-3.5 shrink-0 text-base-content/30 transition-colors group-hover:text-base-content/70" />
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
    </>
  );
};
