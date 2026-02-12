const state = {};
const dynamicInterfaces = []; // array of {interface, ipv4}
const vtyLines = [];

const sections = {
  initdevicesetup: () => `
    <div class="form-container">
      <div class="content" style="display: flex; align-items: center; gap: 20px;">
        <label class="checkBox">
          <input type="checkbox" id="enable" ${state.enable ? "checked" : ""}/> 
          <div class="transition"></div>
          <span class="label-text"></span>
         </label>
         <label>enable</label>
      </div>
      ${["hostname","banner","password","username","domain_name"].map(id => `
        <div class="form-group">
          <label>${id} $ </label>
          <input id="${id}" type="text" placeholder=${id} value="${state[id] || ''}"/>
        </div>
      `).join('')}
    </div>
  `,
  int: () => `
    <div class="form-container">
      <div class="content" style="display: flex; align-items: center; gap: 20px;">
        <label class="checkBox">
          <input type="checkbox" id="configureterminal" ${state.configureterminal ? "checked" : ""}/> 
          <div class="transition"></div>
          <span class="label-text"></span>
         </label>
         <label>configure terminal</label>
      </div>
      <div id="interfaces-container"></div>
      <div class="note">Press this + button below to add more interfaces and ip's </div>
      <button type="button" id="addInterfaceBtn"> [ + ] add_interface </button>
      <div id="vty-container"></div>
      <button type="button" id="addVtyBtn"> [ + ] add_vty </button>
    </div>
  `,
  notifications: () => `
    <div class="form-container">
      <div class="form-group">
        <label>Email</label>
        <input id="notifEmail" type="email" value="${state.notifEmail || ''}"/>
      </div>
    </div>
  `
};

const content = document.getElementById("config-content");
const sidebarItems = document.querySelectorAll(".sidebar li");
const glider = document.querySelector(".glider");


function renderSection(section) {
  content.innerHTML = sections[section]();

  // move glider to clicked section
  const index = Array.from(sidebarItems).findIndex(li => li.dataset.section === section);
  if(glider) glider.style.transform = `translateY(${index * 40}px)`; // adjust 40px to your li height

  // init inputs
  if(section === "initdevicesetup") {
    const cb = document.getElementById("enable");
    cb.addEventListener("change", e => state.enable = e.target.checked);
    ["hostname","banner","password","username","domain_name"].forEach(id => {
      const input = document.getElementById(id);
      input.addEventListener("input", e => state[id] = e.target.value);
    });
  }

  if(section === "int") {
    const cb = document.getElementById("configureterminal");
    cb.addEventListener("change", e => state.configureterminal = e.target.checked);

    const container = document.getElementById("interfaces-container");

    function renderInterfaces() {
      container.innerHTML = "";
      // if empty, push a blank interface so user always sees input
      if(dynamicInterfaces.length === 0) dynamicInterfaces.push({type:"", interface:"", ipv4:"", subnetmask:""});
      dynamicInterfaces.forEach((item, idx) => {
        const div = document.createElement("div");
        div.className = "interface-set";
        div.innerHTML = `
          <div class="form-group">
            <label>interface $ </label>
            <label>
                <input type="radio" name="ethernet-${idx}" value="fastethernet" ${item.type === "fastethernet" ? "checked" : ""}/>
                <span class="radio-text">fast_ethernet</span>
            </label> /
            <label>
                <input type="radio" name="ethernet-${idx}" value="gigabitethernet" ${item.type === "gigabitethernet" ? "checked" : ""}/>
                <span class="radio-text">gigabit_ethernet</span>
            </label>
            <input type="text" class="interface-input" data-idx="${idx}" value="${item.interface}" placeholder="interface"/ >
          </div>
          <div class="form-group">
            <label>ip address $ </label>
            <input type="text" class="ipv4-input" data-idx="${idx}" value="${item.ipv4}" placeholder="ipv4"/>
            <label>subnet mask</label>
            <input type="text" class="subnetmask-input" data-idx="${idx}" value="${item.subnetmask}" placeholder="subnetmask" />
          </div>
        `;
        container.appendChild(div);
      });

      // attach listeners
      container.addEventListener("change", e => {
        if(e.target.matches('input[type="radio"][name^="ethernet-"]')) {
          const div = e.target.closest(".interface-set");
          const idx = div.querySelector(".interface-input").dataset.idx;
          dynamicInterfaces[idx].type = e.target.value;
        }
      });
      container.addEventListener("input", e => {
        const idx = e.target.dataset.idx;
        if(e.target.classList.contains("interface-input")) dynamicInterfaces[idx].interface = e.target.value;
        if(e.target.classList.contains("ipv4-input")) dynamicInterfaces[idx].ipv4 = e.target.value;
        if(e.target.classList.contains("subnetmask-input")) dynamicInterfaces[idx].subnetmask = e.target.value;
      });
    }

    // btn hook
    renderInterfaces();
    document.getElementById("addInterfaceBtn").addEventListener("click", () => {
      dynamicInterfaces.push({type:"", interface:"", ipv4:"", subnetmask:""});
      renderInterfaces();
    });

    const vtyContainer = document.getElementById("vty-container");

    // render for vty
    function renderVtyLines() {
      vtyContainer.innerHTML = "";
      if (vtyLines.length === 0) {
        vtyLines.push({
          linevty: "",
          passwvty: "",
          logintype: "",
          transporttype: "",
          logsync:""
        });
      }

      vtyLines.forEach((item, idx) => {
        const div = document.createElement("div");
        div.className = "vty-set";
        div.innerHTML = `
          <div class="form-group">
            <label>line vty $ </label>
            <input type="text" class="linevty-input" data-idx="${idx}" value="${item.linevty}" placeholder="line vty"/>
            <label>password $ </label>
            <input type="text" class="passwvty-input" data-idx="${idx}" value="${item.passwvty}" placeholder="password"/>
          </div>
          <div class="form-group">
            <div class="loginty-cont">
              <div class="in-cont">login : </div>
              <label>
                <input type="radio" name="login-${idx}" data-idx="${idx}" value="login" />
                <span class="radio-text">login</span>
              </label> /
              <label>
                <input type="radio" name="login-${idx}" data-idx="${idx}" value="no login" />
                <span class="radio-text"> no login</span>
              </label> 
            </div>
          </div>
          <div class="form-group">
            <div class="transin-cont">
              <div class="in-cont">transport input option : </div>
              <label>
                <input type="radio" name="transportinput-${idx}" data-idx="${idx}" value="none" />
                <span class="radio-text">none</span>
              </label> /
              <label>
                <input type="radio" name="transportinput-${idx}" data-idx="${idx}" value="ssh" />
                <span class="radio-text">ssh</span>
              </label> /
              <label>
                <input type="radio" name="transportinput-${idx}" data-idx="${idx}" value="telnet" />
                <span class="radio-text">telnet</span>
              </label> /
              <label>
                <input type="radio" name="transportinput-${idx}" data-idx="${idx}" value="all" />
                <span class="radio-text">all</span>
              </label>
            </div>
          </div>
          <div class="form-group">
            <div class="content" style="display: flex; align-items: center; gap: 20px;">
              <label class="checkBox">
                <input type="checkbox" class="vty-logsync" data-idx="${idx}" ${item.logsync ? "checked" : ""}/> 
                <div class="transition"></div>
                <span class="label-text"></span>
              </label>
              <label>logging synchronous</label>
            </div>
          </div>
        `;
        vtyContainer.appendChild(div);
      });
      // push to vtyContainer
      vtyContainer.addEventListener("change", e => {
      const idx = e.target.dataset.idx;
      if (e.target.matches(".linevty-input")) vtyLines[idx].linevty = e.target.value;
      if (e.target.matches(".passwvty-input")) vtyLines[idx].passwvty = e.target.value;
      if (e.target.name.startsWith("login-")) {
        vtyLines[idx].logintype = e.target.value;
      }
      if (e.target.name.startsWith("transportinput-")) {
        vtyLines[idx].transporttype = e.target.value;
       }
      if (e.target.matches(".vty-logsync")) {
        vtyLines[idx].logsync = e.target.checked;
      }
      });
    }
    renderVtyLines();
    //btn hook
    document.getElementById("addVtyBtn").addEventListener("click", () => {
      vtyLines.push({
        linevty: "",
        passwvty: "",
        logintype:"",
        transporttype:"",
        logsync: ""
      });
      renderVtyLines();
    });
    
  }

  if(section === "notifications") {
    const input = document.getElementById("notifEmail");
    input.addEventListener("input", e => state.notifEmail = e.target.value);
  }
}

sidebarItems.forEach((li, index) => {
  li.addEventListener("click", () => {
    // render section
    renderSection(li.dataset.section);

    // update active for navbar
    sidebarItems.forEach(i => i.classList.remove("active"));
    li.classList.add("active");

    // move glider
    glider.style.transform = `translateY(${index * 100}%)`;
  });
});


// render first section on load
renderSection(sidebarItems[0].dataset.section);
sidebarItems[0].classList.add("active");

// Save button and modal 
document.getElementById("saveBtn").addEventListener("click", () => {
  const lines = [];

  if (state.enable) lines.push("enable");
  if(state.hostname) lines.push("hostname " + state.hostname);
  if(state.banner) lines.push("banner motd # " + state.banner + " #");
  if(state.password) lines.push("password " + state.password);
  if(state.username) lines.push("username " + state.username);
  if(state.domain_name) lines.push("domain name " + state.domain_name);
  if(state.configureterminal) lines.push("configure terminal");
  dynamicInterfaces.forEach(item => {
    if(item.interface) {
    let prefix = '';
    if(item.type === "fastethernet") prefix = "fastethernet ";
    else if(item.type === "gigabitethernet") prefix = "gigabitethernet ";
    lines.push(`interface ${prefix}${item.interface}`);
    if(item.ipv4) lines.push(`ip address ${item.ipv4}` + " " + `${item.subnetmask}`);
    }
  });
  vtyLines.forEach(vty => {
  if (!vty.linevty) return;
  lines.push(`line vty ${vty.linevty}`);
  if (vty.passwvty)
    lines.push(`password ${vty.passwvty}`);
  if (vty.logintype)
    lines.push(`${vty.logintype}`);
  if (vty.transporttype)
    lines.push(`transport input ${vty.transporttype}`);
  if (vty.logsync)
    lines.push(`logging synchronous`);
  });
  if(state.notifEmail) lines.push("notification email " + state.notifEmail);

  document.getElementById("configOutput").textContent = lines.join("\n");
  document.getElementById("resultModal").style.display = "flex";
});

document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("resultModal").style.display = "none";
});
