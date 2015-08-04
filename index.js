import {Record, List} from "immutable";
import {FuncSubject} from "rx-react";
import reactMixin from "react-mixin";
import Rx from "rx";
import React from "react/addons";


const All = Symbol("All");
const Completed = Symbol("Completed");
const Active = Symbol("Active");

var Model = Record({
    tasks: List(),
    field: "some task",
    nextId: 0,
    visibility: All
});

var Task = Record({
    description: "",
    completed: false,
    editing: false,
    id: null
});

const initialModel = new Model({tasks: List([new Task({description: "hi", id: -1})])});

// Update

const NoOp = model => model;
const UpdateField = value => model => model.set("field", value);
const Add = model => {
    model = model.set("tasks", model.tasks.unshift(new Task({id: model.nextId, description: model.field})));
    model = model.set("nextId", model.nextId + 1);
    model = model.set("field", "");
    return model;
};

// type Action
//     = NoOp
//     | UpdateField String
//     | EditingTask Int Bool
//     | UpdateTask Int String
//     | Add
//     | Delete Int
//     | DeleteComplete
//     | Check Int Bool
//     | CheckAll Bool
//     | ChangeVisibility String

// View

let PureRender = reactMixin.decorate(React.addons.PureRenderMixin);

@PureRender
class TaskList extends React.Component {
    render() {
        let {dispatcher, tasks} = this.props;
        return <ul>
            {tasks.map(task =>
                    <TaskC key={task.id} description={task.description} />)}
        </ul>;
    }
}

@PureRender
class TaskC extends React.Component {
    render() {
        return <li>{this.props.description}</li>;
    }
}

class Dispatcher {
    actionStream = new Rx.BehaviorSubject(NoOp);
    modelStream = this.actionStream.scan(initialModel, (model, action) => { return action(model); });
    set rootComponent(component) {
        this._rootComponent = component;
        this._subscription = this.modelStream.subscribe(new RenderObserver(this._rootComponent));
    }
    dispatch(fn) {
        let s = FuncSubject.create();
        fn(s).subscribe(this.actionStream);
        return s;
    }
    dispose() {
        this.subscription.dispose();
    }
}

let magicMap = f => obs => obs.map(f);
let withTargetValue = f => evt => f(evt.target.value);

let dispatcher = new Dispatcher();

class RenderObserver {
    constructor(component) {
        this.component = component;
    }

    onNext(model) {
        this.component.setState({model});
    }
}

@PureRender
class App extends React.Component {
    componentWillMount() {
        let {dispatcher} = this.props;
        this.onAdd = dispatcher.dispatch(magicMap(() => Add));
        this.onFieldChange = dispatcher.dispatch(magicMap(withTargetValue(UpdateField)));
        dispatcher.rootComponent = this;
    }
    render() {
        let {dispatcher} = this.props;
        let {model} = this.state;
        return <div>
            <input type="text" value={model.field} onChange={this.onFieldChange} />
            <button onClick={this.onAdd}>+</button>
            <TaskList tasks={model.tasks} dispatcher={dispatcher} />
            <pre>{JSON.stringify(model, null, 4)}</pre>
        </div>;
    }
    componentWillUnmount() {
        this.modelSubscription.dispose();
        this.modelSubscription = null;
    }

}

React.render(<App dispatcher={dispatcher} />, document.body);
