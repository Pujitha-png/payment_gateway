export function createModal(orderId) {
  const modal = document.createElement('div');
  modal.id = 'payment-gateway-modal';
  modal.setAttribute('data-testid', 'payment-modal');

  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-content">
        <iframe
          data-testid="payment-iframe"
          src="http://localhost:3001/checkout?order_id=${encodeURIComponent(orderId)}&embedded=true"
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

  return modal;
}
