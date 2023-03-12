import * as Elements from './elements.js'
import { routePathnames } from '../controller/route.js'
import * as Util from '../viewpage/util.js'
import { currentUser } from '../controller/firebase_auth.js'
import * as CloudFunctions from '../controller/cloud_functions.js'
import * as Constants from '../model/constants.js'

export function addEventListeners() {

    Elements.menuUsers.addEventListener('click', async () => {
        history.pushState(null, null, routePathnames.USERS);
        const label = Util.disabledButton(Elements.menuUsers);
        await users_page();
        Util.enabledButton(Elements.menuUsers, label);
    })
}

export async function users_page() {
    if (!currentUser) {
        Elements.root.innerHTML = '<h1>Protected Page</h1>'
    }

    let html = `
        <h1>Welcom to User Management Page</h1>
    `;

    let userList;
    try {
        userList = await CloudFunctions.getUserList();
    } catch (e) {
        if (Constants.DEV) console.log(e);
        Util.info('Failed to get User List', JSON.stringify(e));
        return;
    }

    html += `
    <table class="table table-striped">
    <thead>
      <tr>
        <th scope="col">Email</th>
        <th scope="col">Status</th>
        <th scope="col">Action</th>
      </tr>
    </thead>
    <tbody>
    `;

    userList.forEach(user => {
        html += buildUserRow(user);
    })

    Elements.root.innerHTML = html;

    const manageForms = document.getElementsByClassName('form-manage-users');
    for (let i = 0; i < manageForms.length; i++) {
        manageForms[i].addEventListener('submit', async e => {
            e.preventDefault();
            const submitter = e.target.submitter;
            const buttons = e.target.getElementsByTagName('button');
            if (submitter == 'TOGGLE') {
                const label = Util.disabledButton(buttons[0]);
                await toggleDisableUser(e.target);
                Util.enabledButton(buttons[0], label);
            } else if (submitter == 'DELETE') {
                const label = Util.disabledButton(buttons[1]);
                await deleteUser(e.target);
                Util.enabledButton(buttons[1], label);
            } else {
                if (Constants.DEV) console.log(e);
            }
        });
    }
}

async function toggleDisableUser(form) {
    const uid = form.uid.value;
    const disabled = form.disabled.value;
    const update = {
        disabled: disabled == 'true' ? false : true,
    }
    document.getElementById(`user-status-${uid}`).innerHTML = `${update.disabled ? 'Disabled' : 'Active'}`;
    Util.info('Status toggled!', `Disabled: ${update.disabled}`);
    try {
        await CloudFunctions.updateUser(uid, update);
        form.disabled.value = `${update.disabled}`;
    } catch (e) {
        if (Constants.DEV) console.log(e);
        Util.info('Toggle user status failed', JSON.stringify(e));
    }
}

async function deleteUser(form) {
    // confirm
    if (!window.confirm('Press OK to delete the user')) return;

    const uid = form.uid.value;
    try{
        await CloudFunctions.deleteUser(uid);
        document.getElementById(`user-row-${uid}`).remove();
        Util.info('User deleted!', `UID = ${uid}`);
    }catch(e) {
        if(Constants.DEV) console.log(e);
        Util.info('Delete user failed', JSON.stringify(e));
    }
}

function buildUserRow(user) {
    return `
    <tr id="user-row-${user.uid}">
        <td>${user.email}</td>
        <td id="user-status-${user.uid}">${user.disabled ? 'Disabled' : 'Active'}</td>
        <td>
            <form class="form-manage-users" method="post">
                <input type="hidden" name="uid" value="${user.uid}">
                <input type="hidden" name="disabled" value="${user.disabled}">
                <button type="submit" class="btn btn-outline-primary"
                    onClick="this.form.submitter='TOGGLE'">Toggle Active</button>
                <button type="submit" class="btn btn-outline-danger"
                    onClick="this.form.submitter='DELETE'">Delete</button>
            </form>
        </td>
    </tr>
    `;
}