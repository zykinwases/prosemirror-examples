
const prefix = "ProseMirror-prompt";
export function openPrompt(options: { title: string; fields: any; callback: any; }) {
    let wrapper = document.body.appendChild(document.createElement("div"));
    wrapper.className = prefix;

    let mouseOutside = (e: Event) => { if (!wrapper.contains(e.target as Node)) close(); };
    setTimeout(() => window.addEventListener("mousedown", mouseOutside), 50);

    let close = () => {
        window.removeEventListener("mousedown", mouseOutside);
        if (wrapper.parentNode)
            wrapper.parentNode.removeChild(wrapper);
    };

    let domFields: any[] = [];
    for (let name in options.fields)
        domFields.push(options.fields[name].render());

    let submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.className = prefix + "-submit";
    submitButton.textContent = "OK";

    let cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = prefix + "-cancel";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", close);

    let form = wrapper.appendChild(document.createElement("form"));
    if (options.title)
        form.appendChild(document.createElement("h5")).textContent = options.title;
    domFields.forEach(field => {
        form.appendChild(document.createElement("div")).appendChild(field);
    });

    let buttons = form.appendChild(document.createElement("div"));
    buttons.className = prefix + "-buttons";
    buttons.appendChild(submitButton);
    buttons.appendChild(document.createTextNode(" "));
    buttons.appendChild(cancelButton);

    let box = wrapper.getBoundingClientRect();
    wrapper.style.top = ((window.innerHeight - box.height) / 2) + "px";
    wrapper.style.left = ((window.innerWidth - box.width) / 2) + "px";
    
    let submit = () => {
        let params = getValues(options.fields, domFields);
        if (params) {
            close();
            options.callback(params);
        }
    };
    form.addEventListener("submit", e => {
        e.preventDefault();
        submit();
    });
    form.addEventListener("keydown", e => {
        if (e.keyCode === 27) {
            e.preventDefault();
            close();
        }
        else if (e.keyCode === 13 && !(e.ctrlKey || e.metaKey || e.shiftKey)) {
            e.preventDefault();
            submit();
        }
        else if (e.keyCode === 9) {
            window.setTimeout(() => {
                if (!wrapper.contains(document.activeElement))
                    close();
            }, 500);
        }
    });
    let input = form.elements[0];
    if (input)
        (input as HTMLElement).focus();
}
function getValues(fields: { [x: string]: any; }, domFields: any[]) {
    let result = Object.create(null), i = 0;
    for (let name in fields) {
        let field = fields[name], dom = domFields[i++];
        let value = field.read(dom), bad = field.validate(value);
        if (bad) {
            reportInvalid(dom, bad);
            return null;
        }
        result[name] = field.clean(value);
    }
    return result;
}
function reportInvalid(dom: { parentNode: any; offsetLeft: any; offsetWidth: any; offsetTop: number; }, message: any) {
    // FIXME this is awful and needs a lot more work
    let parent = dom.parentNode;
    let msg = parent.appendChild(document.createElement("div"));
    msg.style.left = (dom.offsetLeft + dom.offsetWidth + 2) + "px";
    msg.style.top = (dom.offsetTop - 5) + "px";
    msg.className = "ProseMirror-invalid";
    msg.textContent = message;
    setTimeout(() => parent.removeChild(msg), 1500);
}
/**
The type of field that `openPrompt` expects to be passed to it.
*/
class Field {
    options: {
        clean?: any;
        validate?: any; 
        label: string; 
        required?: boolean; 
        value?: any; 
    };
    /**
    Create a field with the given options. Options support by all
    field types are:
    */
    constructor(
    /**
    @internal
    */
    options: {
        clean?: any;
        validate?: any; 
        label: string; 
        required?: boolean; 
        value?: any; 
    }) {
        this.options = options;
    }
    /**
    Read the field's value from its DOM node.
    */
    read(dom: { value: any; }) { return dom.value; }
    /**
    A field-type-specific validation function.
    */
    validateType(value: any) { return null; }
    /**
    @internal
    */
    validate(value: any) {
        if (!value && this.options.required)
            return "Required field";
        return this.validateType(value) || (this.options.validate ? this.options.validate(value) : null);
    }
    clean(value: any) {
        return this.options.clean ? this.options.clean(value) : value;
    }
}
/**
A field class for single-line text fields.
*/
export class TextField extends Field {
    render() {
        let input = document.createElement("input");
        input.type = "text";
        input.placeholder = this.options.label;
        input.value = this.options.value || "";
        input.autocomplete = "off";
        return input;
    }
}

export class DatalistField extends Field {
    variants: any[]

    constructor(options: {
        clean?: any;
        validate?: any; 
        label: string; 
        required?: boolean; 
        value?: any; 
    }, variants: any[]) {
        super(options)
        this.variants = variants
    }

    render() {
        // let wrapper = document.createElement("div");
        
        let input = document.createElement("input");
        input.type = "text";
        input.setAttribute("list", this.options.label + " datalist")
        input.placeholder = this.options.label;
        input.value = this.options.value || "";
        input.autocomplete = "off";

        let datalist = document.createElement("datalist");
        datalist.id = this.options.label + " datalist"
        this.variants.forEach((v) => {
            let opt = document.createElement("option")
            opt.value = v
            datalist.appendChild(opt)
        })

        input.appendChild(datalist)
        // wrapper.appendChild(input)
        // wrapper.appendChild(datalist);

        return input;
    }
}