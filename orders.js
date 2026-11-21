const orderDialog = document.createElement('dialog');
orderDialog.className = 'order-dialog';
orderDialog.setAttribute('aria-labelledby', 'order-title');
orderDialog.innerHTML = `
  <div class="order-dialog__content">
    <button class="order-dialog__close" type="button" aria-label="Close order form">&times;</button>
    <form class="order-form">
      <h2 id="order-title">Delivery details</h2>
      <p class="order-product"></p>
      <label>Full name<input name="name" autocomplete="name" required maxlength="100"></label>
      <label>Phone number<input name="phone" type="tel" autocomplete="tel" required maxlength="30"></label>
      <label>Street address<input name="address" autocomplete="street-address" required maxlength="200"></label>
      <div class="order-form__row">
        <label>City<input name="city" autocomplete="address-level2" required maxlength="80"></label>
        <label>Postal code<input name="postal" autocomplete="postal-code" required maxlength="20"></label>
      </div>
      <label>Delivery notes <span>(optional)</span><textarea name="notes" rows="3" maxlength="300"></textarea></label>
      <p class="order-demo-note">This demo collects details in this page only. It does not send orders to the shop.</p>
      <button class="order-primary" type="submit">Review order</button>
    </form>
    <section class="order-review" hidden>
      <h2>Confirm your order</h2>
      <p class="order-review__product"></p>
      <p class="order-review__shipping"></p>
      <div class="order-dialog__actions">
        <button class="order-secondary" type="button" data-action="edit">Edit details</button>
        <button class="order-primary" type="button" data-action="confirm">Confirm order</button>
      </div>
    </section>
    <section class="order-success" role="status" aria-live="polite" hidden>
      <h2>Order confirmed</h2>
      <p>Your order details are confirmed on this device. The shop has not received them.</p>
      <button class="order-primary" type="button" data-action="done">Done</button>
    </section>
  </div>`;
document.body.append(orderDialog);

const orderForm = orderDialog.querySelector('.order-form');
const orderReview = orderDialog.querySelector('.order-review');
const orderSuccess = orderDialog.querySelector('.order-success');
let selectedProduct = '';
let selectedPrice = '';

document.addEventListener('click', (event) => {
  const button = event.target.closest('.order-button');
  if (!button) return;

  const item = button.closest('.shop-item');
  selectedProduct = item.querySelector('h3').textContent.trim();
  selectedPrice = item.querySelector('p').textContent.trim();
  orderDialog.querySelector('.order-product').textContent = `${selectedProduct} — ${selectedPrice}`;
  orderForm.hidden = false;
  orderReview.hidden = true;
  orderSuccess.hidden = true;
  orderForm.reset();
  orderDialog.showModal();
});

orderForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!orderForm.reportValidity()) return;

  const details = new FormData(orderForm);
  const name = details.get('name').trim();
  const address = [details.get('address'), details.get('city'), details.get('postal')]
    .map((part) => part.trim())
    .join(', ');
  const phone = details.get('phone').trim();
  const notes = details.get('notes').trim();

  orderReview.querySelector('.order-review__product').textContent = `${selectedProduct} — ${selectedPrice}`;
  orderReview.querySelector('.order-review__shipping').textContent =
    `Deliver to ${name} at ${address}. Phone: ${phone}.${notes ? ` Note: ${notes}` : ''}`;
  orderForm.hidden = true;
  orderReview.hidden = false;
  orderReview.querySelector('[data-action="confirm"]').focus();
});

orderDialog.addEventListener('click', (event) => {
  if (event.target === orderDialog || event.target.closest('.order-dialog__close')) {
    orderDialog.close();
    return;
  }

  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'edit') {
    orderReview.hidden = true;
    orderForm.hidden = false;
  } else if (action === 'confirm') {
    orderReview.hidden = true;
    orderSuccess.hidden = false;
    orderSuccess.querySelector('button').focus();
  } else if (action === 'done') {
    orderDialog.close();
  }
});
