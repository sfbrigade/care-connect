import  AutoComplete  from "./AutoComplete.jsx";

export default {
  title: 'Components/AutoComplete',
  component: AutoComplete,
  parameters:{
    layout: 'centered',
  },
  tags:['autodocs']
};


export const primary = {
  args: {
    label: 'Label',
    placeholder: 'Placeholder',
    value:'',
    onChange: () => {},
    data: ['Option 1', 'Option 2', 'Option 3'],
  },
};
