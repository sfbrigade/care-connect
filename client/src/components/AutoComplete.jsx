import { Autocomplete } from "@mantine/core";

function AutoComplete({ label, placeholder, data, value, onChange }) {
  return <Autocomplete label={label} placeholder={placeholder} data={data} value={value} onChange={onChange} />;
}

export default AutoComplete;
