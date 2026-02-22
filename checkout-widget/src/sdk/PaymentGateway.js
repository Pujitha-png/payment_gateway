import './styles.css';
import { createModal } from './modal';

class PaymentGateway {
  constructor(options) {
    if (!options || typeof options !== 'object') {
      throw new Error('PaymentGateway options are required');
    }
    if (!options.key) {
      throw new Error('key is required');
    }
    if (!options.orderId) {
      throw new Error('orderId is required');
    }

    this.options = options;
    this.onSuccess = typeof options.onSuccess === 'function' ? options.onSuccess : () => {};
    this.onFailure = typeof options.onFailure === 'function' ? options.onFailure : () => {};
    this.onClose = typeof options.onClose === 'function' ? options.onClose : () => {};

    this.modalElement = null;
    this.boundMessageHandler = this.handleMessage.bind(this);
  }

  open() {
    if (this.modalElement) {
      return;
    }

    const modal = createModal(this.options.orderId);
    const closeButton = modal.querySelector('[data-testid="close-modal-button"]');
    closeButton.addEventListener('click', () => this.close());

    document.body.appendChild(modal);
    this.modalElement = modal;

    window.addEventListener('message', this.boundMessageHandler);
  }

  close() {
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }
    window.removeEventListener('message', this.boundMessageHandler);
    this.onClose();
  }

  handleMessage(event) {
    const payload = event.data || {};

    if (payload.type === 'payment_success') {
      this.onSuccess(payload.data || {});
      this.close();
      return;
    }

    if (payload.type === 'payment_failed') {
      this.onFailure(payload.data || {});
      return;
    }

    if (payload.type === 'close_modal') {
      this.close();
    }
  }
}

if (typeof window !== 'undefined') {
  window.PaymentGateway = PaymentGateway;
}

export default PaymentGateway;
