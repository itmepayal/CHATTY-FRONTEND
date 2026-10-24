import { MessageSquare } from "lucide-react";

const NoChatSelected = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 sm:p-16 bg-base-200/40">
      <div className="max-w-sm text-center space-y-5">
        <div className="mx-auto size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <MessageSquare className="size-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Welcome to Chatty</h2>
          <p className="text-base-content/60">
            Pick a contact from the list to open your conversation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NoChatSelected;
