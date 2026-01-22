import  Select from "./Select.jsx";

export default {
  title: 'Components/Select',
  component: Select,
  parameters:{
    layout: 'centered',
  },
  tags:['autodocs']
};


export const primary = {
  args: {
    label: 'Label',
    placeholder: 'Placeholder',
    data: ['Option 1', 'Option 2', 'Option 3'],
  },
};
