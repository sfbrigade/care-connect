import { Select } from "@mantine/core";

function SelectComponent({
  label,
  placeholder,
  data,
  value,
  onChange,
  clearable = true,
  radius,
  styles = {
    input: { backgroundColor: "#ffffff", borderColor: "#4C6EF5" },
    dropdown: {
      borderRadius: "24px",
      padding: "2px",
    },
    empty: {
      textAlign: "left",
      backgroundColor: "#F8F9FA",
      color: "#FA5252",
      margin: "8px",
      borderRadius: "4px",
    },
  },
  nothingFoundMessage = "No results found",
  searchable = true,
  size,
}) {
  return (
    <Select
      label={label}
      placeholder={placeholder}
      data={data}
      value={value}
      onChange={onChange}
      clearable={clearable}
      radius={radius}
      styles={styles}
      searchable={searchable}
      nothingFoundMessage={nothingFoundMessage}
      size={size}
    />
  );
}

export default SelectComponent;
