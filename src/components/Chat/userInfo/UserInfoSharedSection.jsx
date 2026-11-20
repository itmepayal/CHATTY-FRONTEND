import { ExternalLink, Link2, FileText, Download, FileArchive } from "lucide-react";
import { Section } from "./UserInfoUI.jsx";

const formatBytes = (bytes = 0) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const UserInfoSharedSection = ({
  recentPhotos,
  photosCount,
  recentDocs = [],
  docsCount = 0,
  recentLinks,
  uniqueLinksCount,
}) => {
  return (
    <>
      {/* Shared Photos */}
      {recentPhotos.length > 0 && (
        <>
          <div className="border-t border-base-300" />
          <Section title="Shared media" aside={photosCount}>
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

      {/* Shared Documents */}
      {recentDocs.length > 0 && (
        <>
          <div className="border-t border-base-300" />
          <Section title="Shared documents" aside={docsCount}>
            <ul className="space-y-1.5">
              {recentDocs.map((m) => {
                const file = m.file;
                if (!file?.url) return null;
                return (
                  <li key={m.clientId || m.id || m._id}>
                    <a
                      href={file.url}
                      download={file.name || "document"}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group flex items-center gap-3 rounded-xl bg-base-200/60 px-3 py-2.5 transition-colors hover:bg-base-200"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {file.name?.endsWith(".zip") || file.name?.endsWith(".rar") ? (
                          <FileArchive className="size-4" />
                        ) : (
                          <FileText className="size-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-base-content">
                          {file.name || "Document"}
                        </p>
                        <p className="truncate text-[10px] text-base-content/50">
                          {formatBytes(file.size)}
                        </p>
                      </div>
                      <Download className="size-3.5 shrink-0 text-base-content/40 transition-colors group-hover:text-primary" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </Section>
        </>
      )}

      {/* Shared Links */}
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
