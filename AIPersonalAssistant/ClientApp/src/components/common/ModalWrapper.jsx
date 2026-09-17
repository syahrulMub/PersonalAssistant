import React from "react";
import { Modal, ModalHeader, ModalBody } from "reactstrap";
import { BsX } from "react-icons/bs";

/**
 * Reusable Modal Wrapper dengan Slot Komposisi (children)
 * Menyediakan styling dark mode terpadu, ukuran responsif, dan tombol close di kanan atas.
 */
export const ModalWrapper = ({
  isOpen,
  onClose,
  title,
  icon = null,
  size = "md",
  scrollable = false,
  contentClassName = "",
  bodyClassName = "",
  headerClassName = "",
  children,
}) => {
  const defaultContentClass =
    size === "lg"
      ? "rounded-3xl border border-slate-200 dark:!border-slate-800 bg-white/95 dark:!bg-deep-900 shadow-2xl overflow-hidden max-w-2xl mx-auto w-[95%] sm:w-full"
      : size === "xl"
        ? "rounded-3xl border border-slate-200 dark:!border-slate-800 bg-white/95 dark:!bg-deep-900 shadow-2xl overflow-hidden max-w-4xl mx-auto w-[95%] sm:w-full"
        : size === "sm"
          ? "rounded-3xl border border-slate-200 dark:!border-slate-800 bg-white/95 dark:!bg-deep-900 shadow-2xl overflow-hidden max-w-sm mx-auto w-[95%] sm:w-full"
          : "rounded-3xl border border-slate-200 dark:!border-slate-800 bg-white/95 dark:!bg-deep-900 shadow-2xl overflow-hidden max-w-lg mx-auto w-[95%] sm:w-full";

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      aria-label="Tutup Modal"
      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:!text-slate-300 dark:hover:!text-white hover:bg-slate-100 dark:hover:!bg-deep-800 transition-colors ml-auto flex-shrink-0"
    >
      <BsX className="text-2xl leading-none" />
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      toggle={onClose}
      centered
      backdrop={true}
      size={size}
      scrollable={scrollable}
      contentClassName={contentClassName || defaultContentClass}
    >
      {title && (
        <ModalHeader
          toggle={onClose}
          close={closeButton}
          className={`border-b border-slate-200 dark:!border-slate-800 bg-slate-50/90 dark:!bg-deep-950/90 text-slate-900 dark:!text-white px-6 py-4 !flex !items-center !justify-between w-full ${headerClassName}`}
        >
          <span className="font-bold text-sm sm:text-base flex items-center gap-2">
            {icon}
            <span>{title}</span>
          </span>
        </ModalHeader>
      )}
      <ModalBody
        className={`p-6 bg-white/95 dark:!bg-deep-900 text-slate-800 dark:!text-slate-100 ${bodyClassName}`}
      >
        {children}
      </ModalBody>
    </Modal>
  );
};
