import { createContext, useContext, useReducer, useCallback } from "react";
import { transcriptsApi } from "../api/transcripts.js";
import { apiError } from "../api/client.js";

const TranscriptContext = createContext(null);

const initialState = {
  list: [],
  selected: null,
  loading: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "LOADING":
      return { ...state, loading: true, error: null };
    case "LIST_OK":
      return { ...state, loading: false, list: action.list };
    case "SELECT":
      return { ...state, selected: action.transcript };
    case "PREPEND":
      return { ...state, list: [action.transcript, ...state.list] };
    case "UPDATE": {
      const list = state.list.map((t) =>
        t.transcriptId === action.transcript.transcriptId ? action.transcript : t
      );
      return { ...state, list };
    }
    case "ERROR":
      return { ...state, loading: false, error: action.error };
    default:
      return state;
  }
}

export function TranscriptProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadList = useCallback(async () => {
    dispatch({ type: "LOADING" });
    try {
      const { transcripts } = await transcriptsApi.list();
      dispatch({ type: "LIST_OK", list: transcripts });
    } catch (e) {
      dispatch({ type: "ERROR", error: apiError(e) });
    }
  }, []);

  const select = useCallback((transcript) => dispatch({ type: "SELECT", transcript }), []);
  const prepend = useCallback((transcript) => dispatch({ type: "PREPEND", transcript }), []);

  const revoke = useCallback(async (id) => {
    const { transcript } = await transcriptsApi.revoke(id);
    dispatch({ type: "UPDATE", transcript });
    return transcript;
  }, []);

  const value = { ...state, loadList, select, prepend, revoke };
  return (
    <TranscriptContext.Provider value={value}>{children}</TranscriptContext.Provider>
  );
}

export function useTranscripts() {
  const ctx = useContext(TranscriptContext);
  if (!ctx) throw new Error("useTranscripts must be used within TranscriptProvider");
  return ctx;
}

export default TranscriptContext;
