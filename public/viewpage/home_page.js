import * as Elements from './elements.js'
import { routePathnames } from '../controller/route.js'
import { currentUser } from '../controller/firebase_auth.js'
import { Product } from '../model/product.js'
import * as CloudFunction from '../controller/cloud_functions.js'
import * as Util from './util.js'
import * as Constants from '../model/constants.js'
import * as CloudStorage from '../controller/cloud_storage.js'

let imageFile2Upload = null;

export function addEventListeners() {

    Elements.menuHome.addEventListener('click', async () => {
        history.pushState(null, null, routePathnames.HOME);
        const button = Elements.menuHome;
        const label = Util.disabledButton(button);
        await home_page();
        //await Util.sleep(1000);
        Util.enabledButton(button, label)
    });

    Elements.formAddProduct.imageButton.addEventListener('change', e => {
        imageFile2Upload = e.target.files[0];
        if (!imageFile2Upload) {
            Elements.formAddProduct.imageTag.removeAttribute('src');
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(imageFile2Upload);
        reader.onload = () => Elements.formAddProduct.imageTag.src = reader.result;
    });

    Elements.formAddProduct.form.addEventListener('submit', addNewProduct);
}

export async function home_page() {

    if (!currentUser) {
        Elements.root.innerHTML = '<h1>Protected Page</h1>';
        return;
    }

    let html = `
        <div>
            <button class="btn btn-outline-danger" data-bs-toggle="modal" data-bs-target="#modal-add-product">
                +Add Product
            </button>
        </div>
    `;

    let products;
    try {
        products = await CloudFunction.getProductList();
    } catch (e) {
        if (Constants.DEV) console.log(e);
        Util.info('Cannot get product list', JSON.stringify(e));
        Elements.root.innerHTML = html;
        return;
    }

    products.forEach(p => {
        html += buildProductCard(p);
    });

    Elements.root.innerHTML = html;
}

async function addNewProduct(e) {
    e.preventDefault();
    const name = e.target.name.value;
    const price = e.target.price.value;
    const summary = e.target.summary.value;

    const product = new Product({ name, price, summary });

    const button = e.target.getElementsByTagName('button')[0];
    const label = Util.disabledButton(button);

    try {
        //upload the product image => imageName, imageURL
        const { imageName, imageURL } = await CloudStorage.uploadImage(imageFile2Upload);
        product.imageName = imageName;
        product.imageURL = imageURL;
        const docId = await CloudFunction.addProduct(product.toFirestore());
        Util.info('Success!', `Added: ${product.name}, docId = ${docId}`, Elements.modalAddProduct);
        e.target.reset();
        Elements.formAddProduct.imageTag.removeAttribute('src');
        await home_page(); // may be improved later
    } catch (e) {
        if (Constants.DEV) console.log(e);
        Util.info('Add product failed', `${e.code}: ${e.name} - ${e.message}`, Elements.modalAddProduct);
    }

    Util.enabledButton(button, label);
}

function buildProductCard(product) {
    return `
    <div class="card d-inline-flex" style="width: 18rem;">
    <img src="${product.imageURL}" class="card-img-top">
        <div class="card-body">
            <h5 class="card-title">${product.name}</h5>
            <p class="card-text">${product.price.toFixed(2)}<br>${product.summary}</p>
        </div>
    </div>
    `;
}