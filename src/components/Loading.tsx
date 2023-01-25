import { createContext, PropsWithChildren, useContext, useState } from "react";
import { Modal } from "react-bootstrap";

const LoadingContext = createContext<{
  setLoading: (value: boolean) => void;
}>({ setLoading: () => {} });

export const useLoading = () => {
  const { setLoading } = useContext(LoadingContext);
  return { setLoading };
};

export const LoadingWrapper = ({ children }: PropsWithChildren) => {
  const [loading, setLoading] = useState(false);

  return (
    <LoadingContext.Provider value={{ setLoading }}>
      {children}
      <Modal
        className="d-flex justify-content-center align-items-center"
        show={loading}
        dialogAs={() => (
          <div
            className="spinner-border"
            style={{ width: "3rem", height: "3rem" }}
          >
            <span className="visually-hidden">Loading...</span>
          </div>
        )}
      />
    </LoadingContext.Provider>
  );
};
