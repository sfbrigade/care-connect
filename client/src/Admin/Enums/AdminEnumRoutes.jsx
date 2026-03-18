import {Navigate, NavLink, Routes, Route} from 'react-router';
import {Container, Grid, NavLink as MantineNavLink} from '@mantine/core';
import {IconChevronRight} from '@tabler/icons-react';

import AdminFacilityStatusReasonsRoutes from './FacilityStatusReasons/AdminFacilityStatusReasonsRoutes';
import AdminDeflectionCancelReasonsRoutes from './DeflectionCancelReasons/AdminDeflectionCancelReasonsRoutes';
import AdminDeflectionDetailCategoriesRoutes
    from "./DeflectionDetailCategories/AdminDeflectionDetailCategoriesRoutes";
import AdminDeflectionDetailsRoutes from "./DeflectionDetails/AdminDeflectionDetailsRoutes";

function AdminEnumsRoutes() {
    return (
        <Container size='xl'>
            <Grid>
                <Grid.Col span={4}>
                    <MantineNavLink component={NavLink} to='/admin/enums/deflection-cancel-reasons'
                                    label='Arrest Cancel Reasons' rightSection={<IconChevronRight/>}/>
                    <MantineNavLink component={NavLink} to='/admin/enums/facility-status-reasons'
                                    label='Facility Status Reasons' rightSection={<IconChevronRight/>}/>
                    <MantineNavLink component = {NavLink} to = '/admin/enums/deflection-details-categories'
                                    label = 'Detail Categories' rightSection={<IconChevronRight/>}/>
                    <MantineNavLink component = {NavLink} to = '/admin/enums/deflection-details'
                                    label = 'Deflection Details' rightSection={<IconChevronRight/>}/>
                </Grid.Col>
                <Grid.Col span={8}>
                    <Routes>
                        <Route path='facility-status-reasons/*' element={<AdminFacilityStatusReasonsRoutes/>}/>
                        <Route path='deflection-cancel-reasons/*' element={<AdminDeflectionCancelReasonsRoutes/>}/>
                        <Route path='deflection-details-categories/*' element={<AdminDeflectionDetailCategoriesRoutes/>}/>
                        <Route path='deflection-details/*' element = {<AdminDeflectionDetailsRoutes/>}/>
                    </Routes>
                </Grid.Col>
            </Grid>
        </Container>
    );
}

export default AdminEnumsRoutes;
