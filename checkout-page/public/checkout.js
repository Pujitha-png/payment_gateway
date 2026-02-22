(function () {
  class PaymentGateway {
    constructor(options) {
      if (!options || typeof options !== 'object') {
        throw new Error('PaymentGateway options are required');
      }
      if (!options.key) throw new Error('key is required');
      if (!options.orderId) throw new Error('orderId is required');

      this.options = options;
      this.onSuccess = options.onSuccess || function () {};
      this.onFailure = options.onFailure || function () {};
      this.onClose = options.onClose || function () {};
      this.modalElement = null;
      this.boundMessageHandler = this.handleMessage.bind(this);
    }

    open() {
      if (this.modalElement) return;

      this.injectStyles();

      const modal = document.createElement('div');
      modal.id = 'payment-gateway-modal';
      modal.setAttribute('data-testid', 'payment-modal');
      modal.innerHTML = `
        <div class="modal-overlay">
          <div class="modal-content">
            <iframe
              data-testid="payment-iframe"
              src="http://localhost:3001/checkout?order_id=${encodeURIComponent(this.options.orderId)}&embedded=true"
            ></iframe>
            <button
              data-testid="close-modal-button"
              class="close-button"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      `;

      const closeButton = modal.querySelector('[data-testid="close-modal-button"]');
      closeButton.addEventListener('click', () => this.close());

      document.body.appendChild(modal);
      window.addEventListener('message', this.boundMessageHandler);
      this.modalElement = modal;
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
      } else if (payload.type === 'payment_failed') {
        this.onFailure(payload.data || {});
      } else if (payload.type === 'close_modal') {
        this.close();
      }
    }

    injectStyles() {
      if (document.getElementById('payment-gateway-sdk-styles')) return;

      const style = document.createElement('style');
      style.id = 'payment-gateway-sdk-styles';
      style.textContent = `
        #payment-gateway-modal .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          padding: 16px;
        }

        #payment-gateway-modal .modal-content {
          position: relative;
          width: min(520px, 100%);
          height: min(760px, 92vh);
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
        }

        #payment-gateway-modal iframe {
          width: 100%;
          height: 100%;
          border: none;
        }

        #payment-gateway-modal .close-button {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.95);
          cursor: pointer;
          font-size: 20px;
          line-height: 1;
        }
      `;

      document.head.appendChild(style);
    }
  }

  window.PaymentGateway = PaymentGateway;
})();
